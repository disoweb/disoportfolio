import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Clock, Calendar, User, Building, CheckCircle, AlertCircle } from 'lucide-react';

interface ProjectTimerProps {
  project: any;
}

export default function ProjectTimer({ project }: ProjectTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });

  const [timeProgress, setTimeProgress] = useState(0);

  // Use parsed data from database
  const projectData = project || {};
  const contactInfo = project.contactInfo || {};
  const projectDetails = project.projectDetails || {};

  console.log('ProjectTimer - Project data:', {
    id: projectData.id,
    projectName: projectData.projectName,
    contactInfo,
    projectDetails
  });

  // Extract meaningful project information
  const getProjectInfo = () => {
    const now = new Date();

    // Use actual project dates from database
    const startDate = projectData.startDate ? new Date(projectData.startDate) : 
                     projectData.createdAt ? new Date(projectData.createdAt) : now;

    const dueDate = projectData.dueDate ? new Date(projectData.dueDate) : 
                   new Date(startDate.getTime() + (projectData.timelineDays || 28) * 24 * 60 * 60 * 1000);

    // Calculate actual time remaining
    const timeLeft = Math.max(0, dueDate.getTime() - now.getTime());
    const totalDuration = dueDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();

    return {
      id: projectData.id || 'unknown',
      projectName: projectData.projectName || 
                  (contactInfo.fullName ? `${contactInfo.fullName} - Project` : 'Unnamed Project'),
      status: projectData.status || 'active',
      progressPercentage: projectData.progressPercentage || Math.min(95, Math.max(5, Math.floor((elapsed / totalDuration) * 100))),
      currentStage: projectData.currentStage || 'In Progress',
      startDate,
      dueDate,
      timeLeft,
      totalDuration,
      elapsed,
      clientName: contactInfo.fullName || 
                  (projectData.user?.firstName && projectData.user?.lastName 
                    ? `${projectData.user.firstName} ${projectData.user.lastName}` 
                    : projectData.user?.email || 'Client'),
      clientEmail: contactInfo.email || projectData.user?.email || '',
      projectDescription: projectDetails.description || projectData.notes || 'Project in progress',
      timelineWeeks: projectData.timelineWeeks || 4
    };
  };

  const info = getProjectInfo();

  useEffect(() => {
    const calculateTimeRemaining = () => {
      const timeLeft = Math.max(0, info.dueDate.getTime() - new Date().getTime());

      const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
      const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

      setTimeRemaining({ days, hours, minutes, seconds });

      // Calculate time progress based on actual dates
      const progress = Math.min(100, Math.max(0, (info.elapsed / info.totalDuration) * 100));
      setTimeProgress(progress);
    };

    calculateTimeRemaining();
    const timer = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(timer);
  }, [info.dueDate, info.elapsed, info.totalDuration]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'active':
        return 'bg-blue-100 text-blue-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold truncate">
            {info.projectName}
          </CardTitle>
          <Badge className={getStatusColor(info.status)}>
            {info.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Client Details */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          <span className="font-medium">Client Details</span>
        </div>

        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium">{info.clientName}</span>
          </div>
          {info.clientEmail && (
            <div className="text-xs text-gray-600 ml-6">
              {info.clientEmail}
            </div>
          )}
          {info.projectDescription && (
            <div className="text-xs text-gray-600 ml-6 mt-2">
              {info.projectDescription.length > 100 
                ? info.projectDescription.substring(0, 100) + '...'
                : info.projectDescription}
            </div>
          )}
        </div>

        {/* Project Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Project Progress</span>
            <span className="font-medium">{info.progressPercentage}%</span>
          </div>
          <Progress 
            value={info.progressPercentage} 
            className="h-2"
          />
        </div>

        {/* Time Progress */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Time Progress</span>
            <span className="font-medium">{Math.round(timeProgress)}%</span>
          </div>
          <Progress 
            value={timeProgress} 
            className="h-2"
          />
        </div>

        {/* Timeline Information */}
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="text-gray-500">Started</div>
            <div className="font-medium">
              {info.startDate.toLocaleDateString()}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Timeline</div>
            <div className="font-medium">{info.timelineWeeks}</div>
          </div>
          <div>
            <div className="text-gray-500">Due Date</div>
            <div className="font-medium">
              {info.dueDate.toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* Countdown Timer */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-gray-500" />
            <span className="text-gray-600">Time Remaining</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-2xl font-bold text-gray-900">{timeRemaining.days}</div>
              <div className="text-xs text-gray-500">Days</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-2xl font-bold text-gray-900">{timeRemaining.hours}</div>
              <div className="text-xs text-gray-500">Hours</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-2xl font-bold text-gray-900">{timeRemaining.minutes}</div>
              <div className="text-xs text-gray-500">Minutes</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-2">
              <div className="text-2xl font-bold text-gray-900">{timeRemaining.seconds}</div>
              <div className="text-xs text-gray-500">Seconds</div>
            </div>
          </div>
        </div>

        {/* Project Stage */}
        <div className="text-center text-xs text-gray-500 border-t pt-3">
          Timeline: {info.timelineWeeks} | Created: {info.startDate.toLocaleDateString()}
        </div>
      </CardContent>
    </Card>
  );
}